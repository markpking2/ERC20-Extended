const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
require("@nomicfoundation/hardhat-chai-matchers");
const {
  ethers: { BigNumber, ...ethers },
} = require("hardhat");

const mintAmount = BigNumber.from("1000").mul(
  BigNumber.from("10").pow(BigNumber.from("18"))
);

describe("MarkToken contract", function () {
  async function deployTokenFixture() {
    const Token = await ethers.getContractFactory("MarkToken");
    const [owner, addr1, addr2] = await ethers.getSigners();
    const MarkToken = await Token.deploy();
    await MarkToken.deployed();
    return { Token, MarkToken, owner, addr1, addr2 };
  }

  describe("deployment", function () {
    it("should set the right owner", async function () {
      const { MarkToken, owner } = await loadFixture(deployTokenFixture);
      expect(await MarkToken._owner()).to.equal(owner.address);
    });

    it("should assign the total supply of tokens to the contract", async function () {
      const { MarkToken } = await loadFixture(deployTokenFixture);
      const contractBalance = await MarkToken.balanceOf(MarkToken.address);
      expect(await MarkToken.totalSupply()).to.equal(contractBalance);
    });
  });

  describe("onlyOwner", function () {
    it("fails if not owner", async function () {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);
      expect(
        MarkToken.connect(addr1).mintTokensToAddress(addr1.address)
      ).to.be.revertedWith("not owner");
    });
  });

  describe("god-mode functions", function () {
    it("mints token to address", async function () {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);
      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);
      await MarkToken.mintTokensToAddress(addr1.address);
      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("changeBalanceAtAddress", async function () {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);
      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);

      await MarkToken.mintTokensToAddress(addr1.address);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);

      expect(await MarkToken.balanceOf(MarkToken.address)).to.equal(mintAmount);

      await MarkToken.changeBalanceAtAddress(addr1.address);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);

      expect(await MarkToken.balanceOf(MarkToken.address)).to.equal(
        mintAmount.mul(2)
      );
    });

    it("authoritativeTranfer", async function () {
      const { MarkToken, addr1, addr2 } = await loadFixture(deployTokenFixture);
      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);
      expect(await MarkToken.balanceOf(addr2.address)).to.equal(0);

      await MarkToken.mintTokensToAddress(addr1.address);
      await MarkToken.mintTokensToAddress(addr2.address);

      const addr1Balance = await MarkToken.balanceOf(addr1.address);
      const addr2Balance = await MarkToken.balanceOf(addr2.address);

      expect(addr1Balance).to.equal(mintAmount);
      expect(addr2Balance).to.equal(mintAmount);

      await MarkToken.authoritativeTransferFrom(addr1.address, addr2.address);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);
      expect(await MarkToken.balanceOf(addr2.address)).to.equal(
        BigNumber.from(addr1Balance).add(addr2Balance)
      );
    });
  });

  describe("sanctions", function () {
    it("can't sanction zero adress", async () => {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(
        MarkToken.addSanction(ethers.constants.AddressZero)
      ).to.be.revertedWith("can't sanction zero address");
    });

    it("can't sanction MarkToken adress", async () => {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(MarkToken.addSanction(MarkToken.address)).to.be.revertedWith(
        "can't sanction this contract"
      );
    });

    it("sanction an address", async function () {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);

      expect(await MarkToken.checkSanction(addr1.address)).to.equal(false);

      await MarkToken.addSanction(addr1.address);

      expect(await MarkToken.checkSanction(addr1.address)).to.equal(true);
    });

    it("un-sanction an address", async function () {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);

      await MarkToken.addSanction(addr1.address);

      expect(await MarkToken.checkSanction(addr1.address)).to.equal(true);

      await MarkToken.removeSanction(addr1.address);

      expect(await MarkToken.checkSanction(addr1.address)).to.equal(false);
    });

    it("can't send from sanctioned address", async function () {
      const { MarkToken, addr1, addr2 } = await loadFixture(deployTokenFixture);
      await MarkToken.mintTokensToAddress(addr1.address);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);

      await MarkToken.addSanction(addr1.address);

      expect(
        MarkToken.connect(addr1).transfer(addr2.address, 50000)
      ).to.be.revertedWith("from address sanctioned");
    });

    it("can't send to sanctioned address", async function () {
      const { MarkToken, addr1, addr2 } = await loadFixture(deployTokenFixture);
      await MarkToken.mintTokensToAddress(addr1.address);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);

      await MarkToken.addSanction(addr2.address);

      expect(
        MarkToken.connect(addr1).transfer(addr2.address, 50000)
      ).to.be.revertedWith("to address sanctioned");
    });
  });

  describe("token sale functions", function () {
    it("reverts if user doesn't send 1 ether", async () => {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);
      expect(
        parseInt(ethers.utils.formatEther(await addr1.getBalance()))
      ).to.be.greaterThanOrEqual(1);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);

      await expect(
        MarkToken.connect(addr1)["mint()"]({
          value: ethers.utils.parseEther("1.1"),
        })
      ).to.be.revertedWith("only send 1 ether");
    });

    it("mints tokens if user sends 1 ether", async function () {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);
      expect(
        parseInt(ethers.utils.formatEther(await addr1.getBalance()))
      ).to.be.greaterThanOrEqual(1);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);

      await MarkToken.connect(addr1)["mint()"]({
        value: ethers.utils.parseEther("1.0"),
      });

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await MarkToken.balance()).to.equal(
        ethers.utils.parseEther("1.0")
      );
    });

    it("user receives 0.5 either if they send 1000 tokens", async function () {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);

      await MarkToken.fallback({ value: ethers.utils.parseEther("1.0") });

      expect(await MarkToken.balance()).to.equal(
        ethers.utils.parseEther("1.0")
      );

      await MarkToken.mintTokensToAddress(addr1.address);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);

      const beforeBalance = await addr1.getBalance();

      await MarkToken.connect(addr1).sellBack(mintAmount);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(0);

      const afterBalance = await addr1.getBalance();
      expect(
        parseFloat(
          ethers.utils.formatEther(
            BigNumber.from(afterBalance)
              .sub(BigNumber.from(beforeBalance))
              .toString()
          )
        )
      ).to.be.greaterThanOrEqual(0.499);
    });

    it("require sellback increments of 2000", async () => {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);

      await MarkToken.fallback({ value: ethers.utils.parseEther("1.0") });

      expect(await MarkToken.balance()).to.equal(
        ethers.utils.parseEther("1.0")
      );

      await MarkToken.mintTokensToAddress(addr1.address);

      expect(await MarkToken.balanceOf(addr1.address)).to.equal(mintAmount);

      await expect(MarkToken.connect(addr1).sellBack(2001)).to.be.revertedWith(
        "amount must be increments of 2000"
      );
    });

    it("user can't sellback if they don't have enough tokens", async () => {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);
      expect(await MarkToken.balanceOf(addr1.address)).to.be.equal(0);

      await expect(MarkToken.connect(addr1).sellBack(2000)).to.be.revertedWith(
        "insufficient balance"
      );
    });

    it("user can't sellback tokens if contract has no ether", async () => {
      const { MarkToken, addr1 } = await loadFixture(deployTokenFixture);
      expect(await MarkToken.balance()).to.be.equal(0);

      const tx = await MarkToken.connect(addr1)["mint()"]({
        value: ethers.utils.parseEther("1.0"),
      });
      await tx.wait();

      const withdraw = await MarkToken.withdraw(ethers.utils.parseEther("1.0"));
      await withdraw.wait();

      expect(await MarkToken.balanceOf(addr1.address)).to.be.equal(
        ethers.utils.parseEther("1000")
      );

      await expect(MarkToken.connect(addr1).sellBack(2000)).to.be.revertedWith(
        "not enough ether"
      );
    });
  });

  describe("withdraw functions", function () {
    it("owner can withdraw ether", async function () {
      const { MarkToken, owner, addr1 } = await loadFixture(deployTokenFixture);
      await MarkToken.connect(addr1).fallback({
        value: ethers.utils.parseEther("1.0"),
      });

      expect(await MarkToken.balance()).to.equal(
        ethers.utils.parseEther("1.0")
      );

      const beforeBalance = await owner.getBalance();

      await MarkToken.withdraw(ethers.utils.parseEther("1.0"));

      const afterBalance = await owner.getBalance();

      expect(
        parseFloat(
          ethers.utils.formatEther(afterBalance.sub(beforeBalance).toString())
        )
      ).to.be.greaterThanOrEqual(0.999);
    });

    it("can't withdraw if insufficient balance", async () => {
      const { MarkToken, owner, addr1 } = await loadFixture(deployTokenFixture);

      await expect(
        MarkToken.withdraw(BigNumber.from("100000000000000000000000000000000"))
      ).to.be.revertedWith("insufficient balance");
    });
  });

  it("should invoke the fallback function", async () => {
    const { MarkToken, owner } = await loadFixture(deployTokenFixture);
    const tx = expect(
      await owner.sendTransaction({
        to: MarkToken.address,
        data: "0x1234",
        value: ethers.utils.parseEther("1.0"),
      })
    ).to.not.be.reverted;
  });

  it("should not mint as owner with mintTokensToAddress if max supply reached", async () => {
    const { MarkToken, owner } = await loadFixture(deployTokenFixture);

    await MarkToken["mint(address,uint256)"](
      owner.address,
      ethers.utils.parseEther("999000")
    );
    await expect(
      MarkToken.mintTokensToAddress(MarkToken.address)
    ).to.be.revertedWith("max supply reached");
  });

  it("should not mint as non owner if max supply reached", async () => {
    const { MarkToken, owner, addr1 } = await loadFixture(deployTokenFixture);

    await MarkToken["mint(address,uint256)"](
      owner.address,
      ethers.utils.parseEther("999000")
    );

    await expect(
      MarkToken.connect(addr1)["mint()"]({
        value: ethers.utils.parseEther("1"),
      })
    ).to.be.revertedWith("max supply reached");
  });

  it("should not mint as owner with mintTokensToAddress if max supply reached", async () => {
    const { MarkToken, owner } = await loadFixture(deployTokenFixture);

    await MarkToken["mint(address,uint256)"](
      owner.address,
      ethers.utils.parseEther("999000")
    );
    await expect(
      MarkToken["mint(address,uint256)"](
        MarkToken.address,
        ethers.utils.parseEther("1000")
      )
    ).to.be.revertedWith("max supply reached");
  });
});
